import { Composition, Folder } from "remotion";

import { DemoVideo } from "./DemoVideo";
import {
  DOCUMENT_KIT_DURATION_SECONDS,
  DOCUMENT_KIT_FPS,
  DOCUMENT_KIT_HEIGHT,
  DOCUMENT_KIT_WIDTH,
  DocumentKitDemo,
} from "./DocumentKitDemo";
import { FPS, HEIGHT, WIDTH, flows } from "./flows";
import { HeroLoop } from "./HeroLoop";
import {
  HERO_LOOP_DURATION_FRAMES,
  HERO_LOOP_FPS,
  HERO_LOOP_HEIGHT,
  HERO_LOOP_WIDTH,
} from "./heroLoop.config";

export const RemotionRoot = () => {
  return (
    <>
      <Folder name="AidAtlasCA">
        {flows.map((flow) => (
          <Composition
            key={flow.id}
            id={flow.id}
            component={DemoVideo}
            durationInFrames={flow.durationSeconds * FPS}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
            defaultProps={{ flowId: flow.id }}
          />
        ))}
      </Folder>
      <Folder name="Hero">
        <Composition
          id="HeroLoop"
          component={HeroLoop}
          durationInFrames={HERO_LOOP_DURATION_FRAMES}
          fps={HERO_LOOP_FPS}
          width={HERO_LOOP_WIDTH}
          height={HERO_LOOP_HEIGHT}
        />
        <Composition
          id="DocumentKitDemo"
          component={DocumentKitDemo}
          durationInFrames={DOCUMENT_KIT_DURATION_SECONDS * DOCUMENT_KIT_FPS}
          fps={DOCUMENT_KIT_FPS}
          width={DOCUMENT_KIT_WIDTH}
          height={DOCUMENT_KIT_HEIGHT}
        />
      </Folder>
    </>
  );
};
