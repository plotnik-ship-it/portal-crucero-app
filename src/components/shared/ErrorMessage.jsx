const ErrorMessage = ({ message, onRetry }) => {
    return (
        <div className="alert alert-error">
            <p className="font-semibold">Error</p>
            <p>{message}</p>
            {onRetry && (
                <button onClick={onRetry} className="btn btn-sm btn-outline mt-md">
                    Reintentar
                </button>
            )}
        </div>
    );
};

export default ErrorMessage;
