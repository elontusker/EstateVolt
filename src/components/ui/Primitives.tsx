import React, { forwardRef } from "react";

const joinClasses = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(" ");

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, type = "button", ...props }, ref) =>
  React.createElement("button", {
    ...props,
    ref,
    type,
    className: joinClasses(
      "inline-flex items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50",
      className,
    ),
  }),
);
Button.displayName = "Button";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) =>
  React.createElement("input", {
    ...props,
    ref,
    className: joinClasses("outline-none", className),
  }),
);
Input.displayName = "Input";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) =>
  React.createElement("select", {
    ...props,
    ref,
    className: joinClasses("outline-none", className),
  }),
);
Select.displayName = "Select";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, level = 2, ...props }, ref) =>
    React.createElement(`h${level}`, {
      ...props,
      ref,
      className,
    }),
);
Heading.displayName = "Heading";
