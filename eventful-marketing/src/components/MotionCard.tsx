'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface MotionCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps children in a Framer Motion div with spring hover/tap animation.
 * Use on client-side card grids for the Chowdeck-style bounce effect.
 */
export function MotionCard({ children, className = '' }: MotionCardProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ y: 2, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Framer Motion button with spring press-down depth effect (neo-brutalist).
 */
export function MotionButton({
  children,
  className = '',
  onClick,
  type = 'button',
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}) {
  return (
    <motion.button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ x: -1, y: -1, boxShadow: '5px 5px 0 #333333' }}
      whileTap={{ x: 3, y: 3, boxShadow: '0 0 0 #333333' }}
      transition={{ type: 'spring', stiffness: 600, damping: 25 }}
    >
      {children}
    </motion.button>
  );
}
