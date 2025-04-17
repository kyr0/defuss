import ExploreContainer from '../components/ExploreContainer.js';

interface PageProps {
  name: string;
}

export function Page({ name = "foo" }: PageProps) {

  return (
    <ion-content id="main">
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-menu-button />
          </ion-buttons>
          <ion-title>{name}</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-content fullscreen>
        <ion-header collapse="condense">
          <ion-toolbar>
            <ion-title size="large">{name}</ion-title>
          </ion-toolbar>
        </ion-header>
        <ExploreContainer name={name} />
      </ion-content>
    </ion-content>
  )
}