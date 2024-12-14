"use client";
import { useState } from 'react';
import { useForm } from '@formspree/react';
import { Button, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@nextui-org/react";
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

const FeedbackForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [state, handleSubmit] = useForm("2627553113380224651");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleSubmit({
      message: feedback
    });
    if (state.succeeded) {
      setFeedback('');
      setIsOpen(false);
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
          <form onSubmit={onSubmit}>
            <ModalHeader>Submit Feedback</ModalHeader>
            <ModalBody>
              <Textarea
                name="message"
                placeholder="Tell us what's on your mind..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                minRows={3}
                required
              />
              {state.errors && (
                <div className="text-red-500 text-sm mt-2">
                  An error occurred while submitting the form.
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                color="primary" 
                type="submit" 
                disabled={state.submitting}
              >
                {state.submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
}

export default FeedbackForm; 