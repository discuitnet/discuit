import React, { useEffect, useState } from 'react'

const ScrollToTheTop = () => {

    const [isVisible, setIsVisible] = useState(false);

    const toggleVisibility = () => {
        if (window.pageYOffset > 400) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    };

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        })
    }

    useEffect(() => {
        window.addEventListener('scroll', toggleVisibility);
        return () => {
            window.removeEventListener('scroll', toggleVisibility);
        }
    }, [])

    return (
        <div className='scroll-to-top'>
            {isVisible && (
                <button onClick={scrollToTop}>
                    ⬆️
                </button>
            )}
        </div>
    )
}

export default ScrollToTheTop