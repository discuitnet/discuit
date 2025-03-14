import React, { useEffect, useState } from 'react'

const ScrollToTheTop = () => {

    const [isVisible, setIsVisible] = useState(false);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        })
    }

    useEffect(() => {
        const toggleVisibility = () => { window.pageYOffset > 400 ? setIsVisible(true) : setIsVisible(false) };
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