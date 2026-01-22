const Loading = ({ message = 'Cargando...' }) => {
    return (
        <div className="loading">
            <div style={{ textAlign: 'center' }}>
                <div className="spinner"></div>
                <p className="text-muted mt-md">{message}</p>
            </div>
        </div>
    );
};

export default Loading;
