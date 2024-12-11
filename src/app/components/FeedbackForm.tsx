"use client";
import { useState } from 'react';
import { Button, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@nextui-org/react";
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

const FeedbackForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

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
          <form>
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
              <Button color="primary" type="button" onPress={() => setIsOpen(false)}>
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