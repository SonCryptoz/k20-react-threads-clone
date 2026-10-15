import ReplyModal from "./ReplyModal";

const CreatePostModal = ({ isOpen, onClose, onSuccess }) => {
    return (
        <ReplyModal
            isOpen={isOpen}
            onClose={onClose}
            onSuccess={onSuccess}
            mode="create"
        />
    );
};

export default CreatePostModal;
