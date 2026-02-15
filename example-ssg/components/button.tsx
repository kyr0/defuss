import type { Props, FC } from "defuss";
import { $, createRef } from "defuss";

export interface ButtonProps extends Props {
  type?: "send-feedback" | "get-data";
  label?: string;
  className?: string;
}

const ClickButton: FC<ButtonProps> = ({ className, type, label }) => {

  console.log("Button component rendered5");
 
  const ref = createRef<HTMLButtonElement>();
  const onClick = async () => {
    console.log("Button clicked! type:", type);

    switch (type) {
      case "send-feedback":
        await fetch("/api/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ feedback: "This is great!" }),
        });

        $(ref).text("Feedback sent!1");
        break;
      case "get-data":
         const result = await fetch("/api/data.json");
         const data = await result.json().catch(() => null);
         console.log("Data from API:", data);
         $(ref).text("Data fetched!");
         break;
      default:
        console.warn("Unknown button type:", type);
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      id={"click-button" + (type ? `-${type}` : "")}
      style="margin-right: 1rem;"
      className={className}
      onClick={onClick}
    >
       {label || "Click me"}
    </button>
  );
}

export default ClickButton;