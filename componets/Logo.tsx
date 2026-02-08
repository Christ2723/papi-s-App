import React from 'react';

interface LogoProps {
    className?: string;
    size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 40 }) => {
    return (
        <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
            <svg 
                viewBox="0 0 100 100" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-md"
            >
                {/* Golden Circle */}
                <circle cx="50" cy="50" r="45" stroke="url(#goldGradient)" strokeWidth="6" />
                
                {/* Bridge Arch */}
                <path 
                    d="M15 70 Q 50 20 85 70" 
                    stroke="url(#goldGradient)" 
                    strokeWidth="5" 
                    strokeLinecap="round"
                />
                
                {/* Bridge Vertical Supports */}
                <path d="M50 25 V 70" stroke="url(#goldGradient)" strokeWidth="3" strokeDasharray="4 4" />
                <path d="M30 45 V 70" stroke="url(#goldGradient)" strokeWidth="2" />
                <path d="M70 45 V 70" stroke="url(#goldGradient)" strokeWidth="2" />
                
                {/* Water/Base Line */}
                <path d="M20 80 H 80" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" opacity="0.6"/>

                {/* Gradient Definition */}
                <defs>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="100" y2="100">
                        <stop offset="0%" stopColor="#FCD34D" />
                        <stop offset="50%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#B45309" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
};