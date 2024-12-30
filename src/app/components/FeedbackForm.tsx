"use client";
import { useState } from 'react';
import { useForm } from '@formspree/react';
import { Button, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@nextui-org/react";
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

const FeedbackForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [state, handleSubmit] = useForm("xyzyarnr");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      await handleSubmit({
        message: feedback
      });
      
      // Immediately show success and start close timer
      setShowSuccess(true);
      setFeedback('');
      
      setTimeout(() => {
        setIsOpen(false);
        setShowSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowSuccess(false);
    setFeedback('');
  };

  return (
    <>
      <Button
        className="fixed bottom-4 right-4 z-50 feedback-button"
        color="primary"
        isIconOnly
        onPress={() => setIsOpen(true)}
      >
        <ExclamationCircleIcon className="w-6 h-6" />
      </Button>

      <Modal isOpen={isOpen} onClose={handleClose}>
        <ModalContent>
          <form onSubmit={onSubmit}>
            <ModalHeader>Submit Bug Report</ModalHeader>
            <ModalBody>
              {showSuccess ? (
                <div className="text-green-500 text-center py-4">
                  Thank you for your bug report! Testnet users can earn up to 50 XP for valid bug reports.
                </div>
              ) : (
                <>
                  <div className="mb-4 text-sm text-gray-600">
                    This form is for reporting bugs only. Messages won&apos;t receive direct responses.
                    For questions and support, please join our <a href="https://discord.gg/GM5BfpPe2Y" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">Discord community</a>.
                  </div>
                  <Textarea
                    name="message"
                    placeholder="Please describe the bug you encountered..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    minRows={3}
                    required
                  />
                </>
              )}
              {state.errors && (
                <div className="text-red-500 text-sm mt-2">
                  An error occurred while submitting the form.
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={handleClose}>
                Cancel
              </Button>
              {!showSuccess && (
                <Button 
                  color="primary" 
                  type="submit" 
                  disabled={state.submitting || showSuccess}
                >
                  {state.submitting ? 'Submitting...' : 'Submit'}
                </Button>
              )}
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
}

export default FeedbackForm; 