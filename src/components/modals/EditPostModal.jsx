import ReplyModal from "./ReplyModal";
const EditPostModal = ({ isOpen, onClose, post, onSuccess }) => {
    return (
        <ReplyModal
            isOpen={isOpen}
            onClose={onClose}
            post={post}
            onSuccess={onSuccess}
            mode="edit"
        />
    );
};

export default EditPostModal;
