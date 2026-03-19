import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, Children } from 'react';

type AnimationVariant = 'fadeInRight' | 'scaleIn' | 'fadeIn';

interface AnimatedMenuItemsProps {
  children: ReactNode;
  variant?: AnimationVariant;
  staggerDelay?: number;
  className?: string;
}

const variants = {
  fadeInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },
  fadeIn: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
  },
};

export function AnimatedMenuItems({
  children,
  variant = 'fadeInRight',
  staggerDelay = 0.05,
  className,
}: AnimatedMenuItemsProps) {
  const items = Children.toArray(children);
  const v = variants[variant];

  return (
    <AnimatePresence mode="wait">
      <div className={className}>
        {items.map((child, i) => (
          <motion.div
            key={i}
            initial={v.initial}
            animate={v.animate}
            exit={v.exit}
            transition={{
              duration: 0.25,
              delay: i * staggerDelay,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            {child}
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
}
