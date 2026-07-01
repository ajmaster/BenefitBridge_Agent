import { Composition, Folder } from "remotion";

import { DemoVideo } from "./DemoVideo";
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
      <Folder name="BenefitBridge">
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
      </Folder>
    </>
  );
};
