import ReplyModal from "./ReplyModal";

const QuoteModal = ({ isOpen, onClose, post, onSuccess }) => {
    return (
        <ReplyModal
            isOpen={isOpen}
            onClose={onClose}
            post={post}
            onSuccess={onSuccess}
            mode="quote"
        />
    );
};

export default QuoteModal;
