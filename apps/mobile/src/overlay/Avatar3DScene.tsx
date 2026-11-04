import { useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { Renderer } from "expo-three";
import type * as THREE from "three";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Three = require("three") as typeof THREE;
import LottieView from "lottie-react-native";
import { colors } from "../theme";

const orbIdle = require("../../assets/assistant/orb-idle.json");

type Props = {
  /** 0 closed … 1 wide open (lip-sync pulse) */
  mouthOpen: number;
  /** When false, use lightweight 2D Lottie on low-end / web fallback */
  use3d: boolean;
  size?: number;
};

export function Avatar3DScene({ mouthOpen, use3d, size = 96 }: Props) {
  const mouthRef = useRef(mouthOpen);
  mouthRef.current = mouthOpen;

  if (!use3d || Platform.OS === "web") {
    const scale = 1 + mouthOpen * 0.12;
    return (
      <View style={[styles.lottieWrap, { width: size, height: size, transform: [{ scale }] }]}>
        <LottieView source={orbIdle} autoPlay loop style={styles.lottie} />
      </View>
    );
  }

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const renderer = new Renderer({ gl }) as unknown as THREE.WebGLRenderer;
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);

    const scene = new Three.Scene();
    scene.background = null;

    const camera = new Three.PerspectiveCamera(
      45,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      100,
    );
    camera.position.z = 3.2;

    const light = new Three.DirectionalLight(0xffffff, 1.1);
    light.position.set(2, 4, 5);
    scene.add(light);
    scene.add(new Three.AmbientLight(0x8899ff, 0.45));

    const head = new Three.Mesh(
      new Three.SphereGeometry(0.85, 32, 32),
      new Three.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.35, metalness: 0.15 }),
    );
    scene.add(head);

    const mouth = new Three.Mesh(
      new Three.SphereGeometry(0.18, 16, 16),
      new Three.MeshStandardMaterial({ color: 0x1e3a8a }),
    );
    mouth.position.set(0, -0.25, 0.72);
    head.add(mouth);

    const animate = () => {
      head.rotation.y += 0.012;
      const open = mouthRef.current;
      mouth.scale.y = 0.6 + open * 1.4;
      mouth.scale.x = 1 + open * 0.35;
      renderer.render(scene, camera);
      gl.endFrameEXP();
      requestAnimationFrame(animate);
    };
    animate();
  };

  return <GLView style={{ width: size, height: size }} onContextCreate={onContextCreate} />;
}

const styles = StyleSheet.create({
  lottieWrap: {
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: `${colors.primary}22`,
  },
  lottie: { width: "100%", height: "100%" },
});
