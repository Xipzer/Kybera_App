/**
 * Code by Xipzer
 */

import React from 'react'
import { getNetworkLogo, getNetworkName } from '../utils/networks'

interface IconProps {
  className?: string
  size?: number
}

export function EthereumIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
    >
      <g fill="none" fillRule="evenodd">
        <circle cx="16" cy="16" r="16" fill="#627EEA" />
        <g fill="#FFF" fillRule="nonzero">
          <path fillOpacity=".602" d="M16.498 4v8.87l7.497 3.35z" />
          <path d="M16.498 4L9 16.22l7.498-3.35z" />
          <path fillOpacity=".602" d="M16.498 21.968v6.027L24 17.616z" />
          <path d="M16.498 27.995v-6.028L9 17.616z" />
          <path fillOpacity=".2" d="M16.498 20.573l7.497-4.353-7.497-3.348z" />
          <path fillOpacity=".602" d="M9 16.22l7.498 4.353v-7.701z" />
        </g>
      </g>
    </svg>
  )
}

export function BaseIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 111 111"
      width={size}
      height={size}
      className={className}
    >
      <circle cx="55.5" cy="55.5" r="55.5" fill="#0052FF" />
      <circle cx="55.5" cy="55.5" r="36" fill="#FFF" />
      <rect x="55.5" y="51.5" width="36" height="8" fill="#0052FF" />
    </svg>
  )
}

export function BNBIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
    >
      <g fill="none">
        <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
        <path
          fill="#FFF"
          d="M12.116 14.404L16 10.52l3.886 3.886 2.26-2.26L16 6l-6.144 6.144 2.26 2.26zM6 16l2.26-2.26L10.52 16l-2.26 2.26L6 16zm6.116 1.596L16 21.48l3.886-3.886 2.26 2.259L16 26l-6.144-6.144-.003-.003 2.263-2.257zM21.48 16l2.26-2.26L26 16l-2.26 2.26L21.48 16zm-3.188-.002h.002V16L16 18.294l-2.291-2.29-.004-.004.004-.003.401-.402.195-.195L16 13.706l2.293 2.293z"
        />
      </g>
    </svg>
  )
}

export function PolygonIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g fill="none">
        <circle fill="#8247E5" cx="16" cy="16" r="16" />
        <path
          d="M21.092 12.693c-.369-.215-.848-.215-1.254 0l-2.879 1.654-1.955 1.078-2.879 1.653c-.369.216-.848.216-1.254 0l-2.288-1.294c-.369-.215-.627-.61-.627-1.042V12.19c0-.431.221-.826.627-1.042l2.25-1.258c.37-.216.85-.216 1.256 0l2.25 1.258c.37.216.628.611.628 1.042v1.654l1.955-1.115v-1.653a1.16 1.16 0 00-.627-1.042l-4.17-2.372c-.369-.216-.848-.216-1.254 0l-4.244 2.372A1.16 1.16 0 006 11.076v4.78c0 .432.221.827.627 1.043l4.244 2.372c.369.215.849.215 1.254 0l2.879-1.618 1.955-1.114 2.879-1.617c.369-.216.848-.216 1.254 0l2.251 1.258c.37.215.627.61.627 1.042v2.552c0 .431-.22.826-.627 1.042l-2.25 1.294c-.37.216-.85.216-1.255 0l-2.251-1.258c-.37-.216-.628-.611-.628-1.042v-1.654l-1.955 1.115v1.653c0 .431.221.827.627 1.042l4.244 2.372c.369.216.848.216 1.254 0l4.244-2.372c.369-.215.627-.61.627-1.042v-4.78a1.16 1.16 0 00-.627-1.042l-4.28-2.409z"
          fill="#FFF"
        />
      </g>
    </svg>
  )
}

export function ArbitrumIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
    >
      <g fill="none">
        <circle cx="16" cy="16" r="16" fill="#2D374B" />
        <path
          fill="#28A0F0"
          d="M18.4 18.5l-1.5 4.2c0 .1 0 .2 0 .4l2.6 7.2 3.1-1.8-3.7-10C18.8 18.2 18.5 18.2 18.4 18.5z"
        />
        <path
          fill="#28A0F0"
          d="M21.5 11.3c-.1-.2-.4-.2-.5 0l-1.5 4.2c0 .1 0 .2 0 .4l4.3 11.8 3.1-1.8-5.4-14.6z"
        />
        <path
          fill="#FFF"
          d="M16 2.1c.1 0 .2 0 .2.1l11.7 6.7c.1.1.2.2.2.4v13.4c0 .2-.1.3-.2.4l-11.7 6.7c-.1 0-.1.1-.2.1s-.2 0-.2-.1L4.1 23.1c-.1-.1-.2-.2-.2-.4V9.3c0-.2.1-.3.2-.4L15.8 2.2c.1 0 .1-.1.2-.1zM16 0c-.4 0-.8.1-1.2.3L3 7.1C2.2 7.5 1.8 8.3 1.8 9.2v13.5c0 .9.5 1.7 1.2 2.1l11.8 6.8c.4.2.8.3 1.2.3s.8-.1 1.2-.3l11.8-6.8c.8-.4 1.2-1.2 1.2-2.1V9.2c0-.9-.5-1.7-1.2-2.1L17.2.3C16.8.1 16.4 0 16 0z"
          opacity=".6"
        />
        <path
          fill="#FFF"
          d="M15 8.2h-3c-.2 0-.4.1-.5.3l-5.1 14 3.1 1.8 7-19c.1-.2-.1-.4-.2-.4l-1.3.3z"
        />
        <path
          fill="#FFF"
          d="M20.2 8.2h-3c-.2 0-.4.1-.5.3L9.6 28.2l3.1 1.8 7.9-21.5c.1-.2-.1-.4-.2-.4l-.2.1z"
        />
      </g>
    </svg>
  )
}

export function OptimismIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
    >
      <circle fill="#FF0420" cx="16" cy="16" r="16" />
      <path
        fill="#FFF"
        d="M11.3 20.3c-1 0-1.7-.2-2.3-.7-.6-.4-.9-1.1-.9-1.9 0-.2 0-.4.1-.6.1-.6.2-1.3.4-2.1.5-2.2 1.9-3.3 4.2-3.3.6 0 1.2.1 1.7.3.5.2.9.5 1.1.9.3.4.4.9.4 1.4 0 .2 0 .4-.1.6-.1.7-.3 1.4-.4 2.1-.3 1.1-.8 1.9-1.4 2.5-.8.5-1.7.8-2.8.8zm.2-1.7c.4 0 .8-.1 1.1-.4.3-.3.5-.7.7-1.2.2-.8.3-1.4.4-2 0-.2.1-.3.1-.5 0-.7-.4-1.1-1.1-1.1-.4 0-.8.1-1.1.4-.3.3-.5.7-.7 1.2-.1.5-.3 1.2-.4 2 0 .2-.1.3-.1.5-.1.7.3 1.1 1.1 1.1zM16.5 20.2c-.1 0-.2 0-.2-.1 0-.1-.1-.1-.1-.2l1.7-7.8c0-.1.1-.2.1-.2.1-.1.1-.1.2-.1h3c.9 0 1.6.2 2.1.5.5.4.8.9.8 1.6 0 .2 0 .4-.1.6-.2.9-.6 1.6-1.2 2-.6.4-1.4.7-2.5.7h-1.6l-.5 2.6c0 .1-.1.2-.1.2-.1.1-.1.1-.2.1h-1.4zm4.2-4.9c.3 0 .6-.1.9-.3.2-.2.4-.4.5-.8 0-.1 0-.2 0-.4 0-.2-.1-.4-.2-.5-.1-.1-.4-.2-.7-.2h-1.4l-.5 2.1h1.4z"
      />
    </svg>
  )
}

export function SolanaIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="solana-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFA3" />
          <stop offset="100%" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      <g fill="none">
        <circle fill="url(#solana-gradient)" cx="16" cy="16" r="16" />
        <path
          d="M9.925 19.687a.59.59 0 01.415-.17h14.366a.29.29 0 01.207.497l-2.838 2.815a.59.59 0 01-.415.171H7.294a.291.291 0 01-.207-.498l2.838-2.815zm0-10.517A.59.59 0 0110.34 9h14.366c.261 0 .392.314.207.498l-2.838 2.815a.59.59 0 01-.415.17H7.294a.291.291 0 01-.207-.497L9.925 9.17zm12.15 5.225a.59.59 0 00-.415-.17H7.294a.291.291 0 00-.207.498l2.838 2.815c.11.109.26.17.415.17h14.366a.291.291 0 00.207-.498l-2.838-2.815z"
          fill="#FFF"
        />
      </g>
    </svg>
  )
}

export function SOLTokenIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="sol-token-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFA3" />
          <stop offset="100%" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      <g fill="none">
        <circle fill="url(#sol-token-gradient)" cx="16" cy="16" r="16" />
        <path
          d="M9.925 19.687a.59.59 0 01.415-.17h14.366a.29.29 0 01.207.497l-2.838 2.815a.59.59 0 01-.415.171H7.294a.291.291 0 01-.207-.498l2.838-2.815zm0-10.517A.59.59 0 0110.34 9h14.366c.261 0 .392.314.207.498l-2.838 2.815a.59.59 0 01-.415.17H7.294a.291.291 0 01-.207-.497L9.925 9.17zm12.15 5.225a.59.59 0 00-.415-.17H7.294a.291.291 0 00-.207.498l2.838 2.815c.11.109.26.17.415.17h14.366a.291.291 0 00.207-.498l-2.838-2.815z"
          fill="#FFF"
        />
      </g>
    </svg>
  )
}

export function ETHTokenIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
    >
      <g fill="none" fillRule="evenodd">
        <circle cx="16" cy="16" r="16" fill="#627EEA" />
        <g fill="#FFF" fillRule="nonzero">
          <path fillOpacity=".602" d="M16.498 4v8.87l7.497 3.35z" />
          <path d="M16.498 4L9 16.22l7.498-3.35z" />
          <path fillOpacity=".602" d="M16.498 21.968v6.027L24 17.616z" />
          <path d="M16.498 27.995v-6.028L9 17.616z" />
          <path fillOpacity=".2" d="M16.498 20.573l7.497-4.353-7.497-3.348z" />
          <path fillOpacity=".602" d="M9 16.22l7.498 4.353v-7.701z" />
        </g>
      </g>
    </svg>
  )
}

export function BNBTokenIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
    >
      <g fill="none">
        <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
        <path
          fill="#FFF"
          d="M12.116 14.404L16 10.52l3.886 3.886 2.26-2.26L16 6l-6.144 6.144 2.26 2.26zM6 16l2.26-2.26L10.52 16l-2.26 2.26L6 16zm6.116 1.596L16 21.48l3.886-3.886 2.26 2.259L16 26l-6.144-6.144-.003-.003 2.263-2.257zM21.48 16l2.26-2.26L26 16l-2.26 2.26L21.48 16zm-3.188-.002h.002V16L16 18.294l-2.291-2.29-.004-.004.004-.003.401-.402.195-.195L16 13.706l2.293 2.293z"
        />
      </g>
    </svg>
  )
}

export function MATICTokenIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g fill="none">
        <circle fill="#8247E5" cx="16" cy="16" r="16" />
        <path
          d="M21.092 12.693c-.369-.215-.848-.215-1.254 0l-2.879 1.654-1.955 1.078-2.879 1.653c-.369.216-.848.216-1.254 0l-2.288-1.294c-.369-.215-.627-.61-.627-1.042V12.19c0-.431.221-.826.627-1.042l2.25-1.258c.37-.216.85-.216 1.256 0l2.25 1.258c.37.216.628.611.628 1.042v1.654l1.955-1.115v-1.653a1.16 1.16 0 00-.627-1.042l-4.17-2.372c-.369-.216-.848-.216-1.254 0l-4.244 2.372A1.16 1.16 0 006 11.076v4.78c0 .432.221.827.627 1.043l4.244 2.372c.369.215.849.215 1.254 0l2.879-1.618 1.955-1.114 2.879-1.617c.369-.216.848-.216 1.254 0l2.251 1.258c.37.215.627.61.627 1.042v2.552c0 .431-.22.826-.627 1.042l-2.25 1.294c-.37.216-.85.216-1.255 0l-2.251-1.258c-.37-.216-.628-.611-.628-1.042v-1.654l-1.955 1.115v1.653c0 .431.221.827.627 1.042l4.244 2.372c.369.216.848.216 1.254 0l4.244-2.372c.369-.215.627-.61.627-1.042v-4.78a1.16 1.16 0 00-.627-1.042l-4.28-2.409z"
          fill="#FFF"
        />
      </g>
    </svg>
  )
}

export const NETWORK_ICONS: Record<string, React.FC<IconProps>> = {
  ethereum: EthereumIcon,
  base: BaseIcon,
  bsc: BNBIcon,
  polygon: PolygonIcon,
  arbitrum: ArbitrumIcon,
  optimism: OptimismIcon,
  'solana-mainnet': SolanaIcon,
  'solana-devnet': SolanaIcon,
}

export const NATIVE_TOKEN_ICONS: Record<string, React.FC<IconProps>> = {
  ETH: ETHTokenIcon,
  SOL: SOLTokenIcon,
  BNB: BNBTokenIcon,
  MATIC: MATICTokenIcon,
  POL: MATICTokenIcon,
}

export function NativeTokenIcon({ symbol, className, size = 32 }: IconProps & { symbol: string }) {
  const IconComponent = NATIVE_TOKEN_ICONS[symbol.toUpperCase()]
  if (IconComponent) {
    return <IconComponent className={className} size={size} />
  }
  return null
}

// Deterministic accent color for the initial-letter fallback avatar.
const FALLBACK_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#a855f7', '#ef4444',
]

function fallbackColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length]
}

function InitialAvatar({ name, size, className }: { name: string; size: number; className?: string }) {
  const letter = (name.trim()[0] || '?').toUpperCase()
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        background: fallbackColor(name),
        fontSize: Math.round(size * 0.5),
      }}
      aria-hidden
    >
      {letter}
    </span>
  )
}

/**
 * Network icon with graceful fallback:
 *   1. crisp local SVG for the main chains (by networkId)
 *   2. remote logo (logoURI, DefiLlama CDN) for everything else
 *   3. deterministic colored initial-letter avatar if the image fails/absent
 */
export function NetworkIcon({
  networkId,
  logoURI,
  name,
  className,
  size = 32,
}: IconProps & { networkId: string; logoURI?: string; name?: string }) {
  const IconComponent = NETWORK_ICONS[networkId]
  const [imgFailed, setImgFailed] = React.useState(false)

  if (IconComponent) {
    return <IconComponent className={className} size={size} />
  }

  // Auto-resolve the remote logo + name from the network registry when the
  // caller only passed a networkId, so every call site gets icons for free.
  const resolvedLogo = logoURI ?? getNetworkLogo(networkId)
  const resolvedName = name ?? getNetworkName(networkId) ?? networkId

  if (resolvedLogo && !imgFailed) {
    return (
      <img
        src={resolvedLogo}
        alt={`${resolvedName} logo`}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setImgFailed(true)}
        className={`rounded-full object-cover bg-white/5 ${className ?? ''}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return <InitialAvatar name={resolvedName} size={size} className={className} />
}