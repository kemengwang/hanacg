import React, { useEffect, useCallback } from 'react'
import styled from 'styled-components'

// 社会主义核心价值观词语
const WORDS = [
  '富强',
  '民主',
  '文明',
  '和谐',
  '自由',
  '平等',
  '公正',
  '法治',
  '爱国',
  '敬业',
  '诚信',
  '友善'
]

// 浮动文字样式
const FloatingText = styled.b<{ x: number; y: number; color: string; opacity: number; scale: number }>`
  position: fixed;
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  font-size: 16px;
  cursor: default;
  color: ${props => props.color};
  opacity: ${props => props.opacity};
  transform: scale(${props => props.scale});
  pointer-events: none;
  user-select: none;
  transition: none;
  z-index: 9999;
  font-weight: 500;
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.5);
`

interface WordInstance {
  id: number
  text: string
  x: number
  y: number
  color: string
  opacity: number
  scale: number
}

// 生成随机颜色
const randomColor = (): string => {
  const r = Math.floor(Math.random() * 255)
  const g = Math.floor(Math.random() * 255)
  const b = Math.floor(Math.random() * 255)
  return `rgb(${r}, ${g}, ${b})`
}

const ClickEffect: React.FC = () => {
  const [words, setWords] = React.useState<WordInstance[]>([])
  const wordIndexRef = React.useRef(0)
  const animationFrameRef = React.useRef<number>()

  // 处理点击事件
  const handleClick = useCallback((event: MouseEvent) => {
    const fontSize = 16
    const x = event.clientX - fontSize / 2
    const y = event.clientY - fontSize

    const newWord: WordInstance = {
      id: Date.now() + Math.random(),
      text: WORDS[wordIndexRef.current],
      x,
      y,
      color: randomColor(),
      opacity: 1,
      scale: 1.2
    }

    // 更新词语索引
    wordIndexRef.current = (wordIndexRef.current + 1) % WORDS.length

    setWords(prev => [...prev, newWord])
  }, [])

  // 动画更新循环
  useEffect(() => {
    const updateWords = () => {
      setWords(prev => {
        const updated = prev.map(word => ({
          ...word,
          y: word.y - 1, // 向上移动
          opacity: word.opacity - 0.016, // 逐渐消失
          scale: word.scale + 0.002 // 逐渐放大
        }))

        // 移除已经完全透明的词语
        const visible = updated.filter(word => word.opacity > 0)

        return visible
      })

      animationFrameRef.current = requestAnimationFrame(updateWords)
    }

    animationFrameRef.current = requestAnimationFrame(updateWords)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // 添加全局点击事件监听
  useEffect(() => {
    window.addEventListener('click', handleClick)

    return () => {
      window.removeEventListener('click', handleClick)
    }
  }, [handleClick])

  return (
    <>
      {words.map(word => (
        <FloatingText
          key={word.id}
          x={word.x}
          y={word.y}
          color={word.color}
          opacity={word.opacity}
          scale={word.scale}
        >
          {word.text}
        </FloatingText>
      ))}
    </>
  )
}

export default ClickEffect
