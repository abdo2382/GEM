import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode, type BloomEffect } from 'postprocessing'
import { num, sampleFrame } from './director'

/**
 * Restrained cinematic grade: highlight bloom, vignette, ACES and fine film grain.
 * `lite` (medium tier) keeps the bloom, tone and vignette but halves the bloom's blur
 * levels and drops the film grain and multisampling, each a full-screen cost on phones.
 */
export function PostFX({ mode, multisampling }: { mode: 'lite' | 'full'; multisampling: number }) {
  const bloom = useRef<BloomEffect>(null)
  useFrame((state) => {
    sampleFrame(state.clock.elapsedTime)
    if (bloom.current) bloom.current.intensity = num('bloom')
  })
  if (mode === 'lite') {
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom ref={bloom} intensity={0.7} luminanceThreshold={0.9} luminanceSmoothing={0.22} mipmapBlur levels={4} radius={0.72} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.24} darkness={0.78} />
      </EffectComposer>
    )
  }
  return (
    <EffectComposer multisampling={multisampling} enableNormalPass={false}>
      <Bloom ref={bloom} intensity={0.7} luminanceThreshold={0.9} luminanceSmoothing={0.22} mipmapBlur radius={0.72} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.24} darkness={0.78} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.42} />
    </EffectComposer>
  )
}
