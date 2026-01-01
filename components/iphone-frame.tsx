import React from 'react'

interface IPhoneFrameProps {
  children: React.ReactNode
}

export function IPhoneFrame({ children }: IPhoneFrameProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100 overflow-hidden">
      <div className="relative max-h-screen py-4">
        {/* iPhone frame */}
        <div className="relative w-[375px] h-[min(812px,calc(100vh-2rem))] bg-black rounded-[60px] p-3 shadow-2xl">
          {/* Inner screen bezel */}
          <div className="relative w-full h-full bg-white rounded-[48px] overflow-hidden">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-black rounded-b-3xl z-10"></div>

            {/* Screen content */}
            <div className="relative w-full h-full bg-white overflow-y-auto">
              {children}
            </div>
          </div>
        </div>

        {/* Side buttons */}
        <div className="absolute -left-2 top-32 w-1 h-12 bg-black/30 rounded-l-sm"></div>
        <div className="absolute -left-2 top-48 w-1 h-16 bg-black/30 rounded-l-sm"></div>
        <div className="absolute -left-2 top-68 w-1 h-16 bg-black/30 rounded-l-sm"></div>
        <div className="absolute -right-2 top-48 w-1 h-20 bg-black/30 rounded-r-sm"></div>
      </div>
    </div>
  )
}
