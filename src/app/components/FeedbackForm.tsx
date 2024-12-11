"use client";
import { useState, useEffect } from 'react';
import { Button, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@nextui-org/react";
import { useWalletContext } from '../hooks/useWallet';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

const FeedbackForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>({});
  const { account, userId } = useWalletContext();

  useEffect(() => {
    const gatherDebugInfo = () => {
      const info = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        accountId: account || 'not connected',
        userId: userId || 'not available',
      };
      setDebugInfo(info);
    };

    gatherDebugInfo();
  }, [account, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/__forms.html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          'form-name': 'feedback',
          feedback,
          debugInfo: JSON.stringify(debugInfo)
        }).toString()
      });

      if (response.ok) {
        setFeedback('');
        setIsOpen(false);
        alert('Thank you for your feedback!');
      } else {
        throw new Error(`Submission failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  return (
    <>
      <Button
        className="fixed bottom-4 right-4 z-50 feedback-button"
        color="primary"
        isIconOnly
        onClick={() => setIsOpen(true)}
      >
        <ExclamationCircleIcon className="w-6 h-6" />
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <input type="hidden" name="form-name" value="feedback" />
            
            <ModalHeader>Submit Feedback</ModalHeader>
            <ModalBody>
              <Textarea
                name="feedback"
                placeholder="Tell us what's on your mind..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                minRows={3}
                required
              />
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button color="primary" type="submit">
                Submit
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
}

export default FeedbackForm; 