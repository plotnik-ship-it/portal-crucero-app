import { SkeletonCard } from './Skeleton';

const Loading = ({ message = 'Cargando...' }) => {
    return (
        <div className="loading">
            <div style={{ textAlign: 'center' }}>
                <div className="spinner"></div>
                <p className="text-muted mt-md">{message}</p>
            </div>
            <div style={{ marginTop: '2rem' }}>
                <SkeletonCard />
                <div style={{ marginTop: '1rem' }}>
                    <SkeletonCard />
                </div>
            </div>
        </div>
    );
};

export default Loading;
