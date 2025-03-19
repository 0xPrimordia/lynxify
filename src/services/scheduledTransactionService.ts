// src/services/scheduledTransactionService.ts
import { Client, ScheduleCreateTransaction, ContractExecuteTransaction, ContractFunctionParameters, Timestamp } from "@hashgraph/sdk";
import { hcsGovernanceService } from './hcsService';

export class ScheduledTransactionService {
  private client: Client;
  
  constructor() {
    this.client = Client.forTestnet();
    this.client.setOperator(
      process.env.NEXT_PUBLIC_OPERATOR_ID!,
      process.env.OPERATOR_KEY!
    );
  }
  
  async scheduleCompositionUpdate(newComposition: any, executionTime: Date): Promise<string> {
    // Create the contract execute transaction
    const contractExecuteTx = new ContractExecuteTransaction()
      .setContractId(process.env.MINTING_CONTRACT_ID!)
      .setGas(1000000)
      .setFunction(
        "updateTokenComposition",
        new ContractFunctionParameters()
          .addString(JSON.stringify(newComposition))
      );
    
    // Schedule the transaction
    const scheduleTx = new ScheduleCreateTransaction()
      .setScheduledTransaction(contractExecuteTx)
      .setScheduleMemo(`Composition update scheduled for ${executionTime.toISOString()}`)
      .setExpirationTime(Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))); // 1 week expiration
    
    // Execute the schedule creation
    const txResponse = await scheduleTx.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);
    const scheduleId = receipt.scheduleId!.toString();
    
    // Record the scheduled update in the governance topic
    const mainTopicId = await hcsGovernanceService.getOrCreateMainGovernanceTopic();
    await hcsGovernanceService.submitTopicMessage(
      mainTopicId.toString(),
      JSON.stringify({
        type: "COMPOSITION_UPDATE_SCHEDULED",
        composition: newComposition,
        scheduleId,
        scheduledTime: executionTime.toISOString(),
        timestamp: new Date().toISOString()
      })
    );
    
    return scheduleId;
  }
  
  async scheduleGradualTransition(
    currentComposition: any,
    targetComposition: any,
    transitionDays: number,
    steps: number = 10
  ): Promise<string[]> {
    const scheduleIds: string[] = [];
    
    for (let step = 1; step <= steps; step++) {
      // Calculate execution time for this step
      const executionTime = new Date();
      executionTime.setDate(executionTime.getDate() + (transitionDays * step / steps));
      
      // Calculate intermediate composition
      const intermediateComposition = this.calculateIntermediateComposition(
        currentComposition,
        targetComposition,
        step / steps
      );
      
      // Schedule this step
      const scheduleId = await this.scheduleCompositionUpdate(
        intermediateComposition,
        executionTime
      );
      
      scheduleIds.push(scheduleId);
    }
    
    return scheduleIds;
  }
  
  private calculateIntermediateComposition(
    currentComposition: any,
    targetComposition: any,
    progress: number // 0.0 to 1.0
  ): any {
    // Calculate weighted average between current and target compositions
    const result: any = { categories: {} };
    
    // For each category in the target composition
    Object.entries(targetComposition.categories).forEach(([categoryName, targetCategory]: [string, any]) => {
      const currentCategory = currentComposition.categories[categoryName];
      
      // If category exists in current composition
      if (currentCategory) {
        result.categories[categoryName] = {
          name: categoryName,
          selectedToken: targetCategory.selectedToken,
          tokens: targetCategory.tokens,
          allocations: {}
        };
        
        // Calculate intermediate allocations
        Object.entries(targetCategory.allocations || {}).forEach(([token, targetAllocation]: [string, any]) => {
          const currentAllocation = currentCategory.allocations?.[token] || 0;
          result.categories[categoryName].allocations[token] = 
            currentAllocation + (targetAllocation - currentAllocation) * progress;
        });
      } else {
        // New category - add with scaled allocation
        result.categories[categoryName] = {
          name: categoryName,
          selectedToken: targetCategory.selectedToken,
          tokens: targetCategory.tokens,
          allocations: {}
        };
        
        Object.entries(targetCategory.allocations || {}).forEach(([token, allocation]: [string, any]) => {
          result.categories[categoryName].allocations[token] = allocation * progress;
        });
      }
    });
    
    return result;
  }
}

export const scheduledTransactionService = new ScheduledTransactionService();