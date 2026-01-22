const Card = ({ children, className = '', hover = false }) => {
    return (
        <div className={`card ${hover ? 'card-hover' : ''} ${className}`}>
            {children}
        </div>
    );
};

export default Card;
