import { Composition, Folder } from "remotion";

import { DemoVideo } from "./DemoVideo";
import { FPS, HEIGHT, WIDTH, flows } from "./flows";

export const RemotionRoot = () => {
  return (
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
  );
};
