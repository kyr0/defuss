import "./ExploreContainer.css";

interface ContainerProps {
  name: string;
}

// testing some components
const ExploreContainer = ({ name }: ContainerProps) => {
  return (
    <div id="container">
      <strong>{name}</strong>
      <p>
        Explore{" "}
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://ionicframework.com/docs/components"
        >
          UI Components
        </a>
      </p>
      <ion-chip>Default</ion-chip>
      <ion-chip disabled="true">Disabled</ion-chip>
      <ion-chip outline="true">Outline</ion-chip>

      <ion-card>
        <ion-card-header>
          <ion-card-title>Card Title</ion-card-title>
          <ion-card-subtitle>Card Subtitle</ion-card-subtitle>
        </ion-card-header>

        <ion-card-content>
          Here's a small text description for the card content. Nothing more,
          nothing less.
        </ion-card-content>
      </ion-card>
    </div>
  );
};

export default ExploreContainer;
