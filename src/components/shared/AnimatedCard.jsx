import { useState, useEffect } from 'react';

/**
 * AnimatedCard Component
 * Wrapper component that adds fade-in animation with optional delay
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to animate
 * @param {number} props.delay - Delay in milliseconds before animation starts
 * @param {string} props.animation - Animation type: 'fade', 'slide', 'scale'
 * @param {string} props.className - Additional CSS classes
 */
const AnimatedCard = ({
    children,
    delay = 0,
    animation = 'fade',
    className = ''
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, delay);

        return () => clearTimeout(timer);
    }, [delay]);

    const getAnimationClass = () => {
        switch (animation) {
            case 'slide':
                return 'animate-slide-in';
            case 'scale':
                return 'animate-scale-in';
            case 'fade':
            default:
                return 'animate-fade-in';
        }
    };

    return (
        <div
            className={`${className} ${isVisible ? getAnimationClass() : 'opacity-0'}`}
            style={{
                animationDelay: `${delay}ms`,
                opacity: isVisible ? 1 : 0
            }}
        >
            {children}
        </div>
    );
};

export default AnimatedCard;
