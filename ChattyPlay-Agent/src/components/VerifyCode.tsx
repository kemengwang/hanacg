import React, { useEffect, useRef } from 'react'
import styled from 'styled-components'

interface VerifyCodeProps {
  code: string
}

const CanvasWrapper = styled.div`
  width: 120px;
  height: 40px;

  canvas {
    border-radius: 8px;
    cursor: pointer;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }
`

const VerifyCode: React.FC<VerifyCodeProps> = ({ code }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 绘制干扰线
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.strokeStyle = `rgba(0, 0, 0, ${Math.random() * 0.3})`
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height)
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height)
      ctx.lineWidth = Math.random() * 2 + 1
      ctx.stroke()
    }

    // 绘制文字
    const fontSize = 24
    const charSpacing = canvas.width / code.length
    ctx.font = `bold ${fontSize}px Arial`

    for (let i = 0; i < code.length; i++) {
      ctx.save()

      // 随机倾斜
      const rotate = (Math.random() - 0.5) * 0.4
      ctx.translate(i * charSpacing + charSpacing / 2, canvas.height / 2)
      ctx.rotate(rotate)

      // 随机颜色
      const color = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.8)`
      ctx.fillStyle = color

      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'

      ctx.fillText(code[i], 0, 0)

      ctx.restore()
    }

    // 绘制干扰点
    for (let i = 0; i < 50; i++) {
      ctx.beginPath()
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 1.5,
        0,
        2 * Math.PI
      )
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.3})`
      ctx.fill()
    }
  }, [code])

  return (
    <CanvasWrapper>
      <canvas
        ref={canvasRef}
        width={120}
        height={40}
      />
    </CanvasWrapper>
  )
}

export default VerifyCode
