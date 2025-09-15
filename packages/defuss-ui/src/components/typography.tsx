import { createRef, type Props, type Ref, type VNode } from "defuss";

/**
 * Example usage:
 * <Heading level={2} headingStyle="divider">Section</Heading>
<Hero size="lg">Big headline</Hero>
<Text modifier="lead">This is a lead paragraph</Text>
<Paragraph>This is a paragraph.</Paragraph>
<Blockquote>Here’s an inspiring quote.</Blockquote>
<InlineCode>npm install</InlineCode>
<Text modifier="background">With background gradient</Text>
 */

export type HeadingLevel = 1 | 2 | 3 | 4;
export type HeroLevel = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
export type HeadingStyle = "divider" | "line" | "bullet";

export interface TypographyProps extends Props {
  className?: string;
  ref?: Ref;
  children?: VNode;
  [key: string]: any; // HTML only
}

// Heading utility—for h1–h4, also supports .uk-hX class and heading-style
export const Heading = ({
  level = 1,
  className = "",
  headingStyle,
  ref = createRef(),
  children,
  ...props
}: TypographyProps & { level?: HeadingLevel; headingStyle?: HeadingStyle }) => {
  const tag = `h${level}` as keyof JSX.IntrinsicElements;
  const ukClass = `uk-h${level}`;
  const styleClass = headingStyle ? `uk-heading-${headingStyle}` : "";
  const classes = [ukClass, styleClass, className].filter(Boolean).join(" ");
  return {
    type: tag,
    attributes: { ref, class: classes, ...props },
    children,
  } as VNode;
};

// Hero heading utility
export const Hero = ({
  size = "md",
  className = "",
  ref = createRef(),
  children,
  ...props
}: TypographyProps & { size?: HeroLevel }) => {
  const ukClass = `uk-hero-${size}`;
  const classes = [ukClass, className].filter(Boolean).join(" ");
  return (
    <div ref={ref} class={classes} {...props}>
      {children}
    </div>
  );
};

// Text utility for .uk-text-lead, .uk-text-meta, .uk-text-sm, .uk-text-base, etc.
type TextModifier =
  | "lead"
  | "meta"
  | "sm"
  | "base"
  | "truncate"
  | "break"
  | "background";
export const Text = ({
  modifier,
  className = "",
  ref = createRef(),
  children,
  ...props
}: TypographyProps & { modifier?: TextModifier }) => {
  const ukClass = modifier ? `uk-text-${modifier}` : "";
  const classes = [ukClass, className].filter(Boolean).join(" ");
  return (
    <span ref={ref} class={classes} {...props}>
      {children}
    </span>
  );
};

// Paragraph
export const Paragraph = ({
  className = "",
  ref = createRef(),
  children,
  ...props
}: TypographyProps) => (
  <p ref={ref} class={className} {...props}>
    {children}
  </p>
);

// Blockquote
export const Blockquote = ({
  className = "",
  ref = createRef(),
  children,
  ...props
}: TypographyProps) => (
  <blockquote ref={ref} class={className} {...props}>
    {children}
  </blockquote>
);

// Inline code
export const InlineCode = ({
  className = "",
  ref = createRef(),
  children,
  ...props
}: TypographyProps) => (
  <code ref={ref} class={className} {...props}>
    {children}
  </code>
);
