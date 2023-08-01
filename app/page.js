'use client'
import Image from 'next/image'
import profile from '/public/profile.png'
import big_logo_light from '/public/big_logo_light.png'
import big_logo_dark from '/public/big_logo_dark.png'
import {Button} from "@/components/ui/button"
import { Icon } from '@iconify/react'



export default function Home() {
  return (
    <main className="container text-center md:w-2/3 lg:w-1/2 sm:pt-32 md:pt-28 lg:pt-80 xl:pt-96">
      <section id="about" className="pt-10 place-self">
        <h3 className="text-4xl z-10 -rotate-[6.75deg]">👋Hello, World!</h3>
        <div className="flex justify-center pt-2">
            <h2 className="text-4xl my-auto">I&apos;m&nbsp;</h2>
            <h2 className="text-5xl my-auto bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text dark:bg-gradient-to-r dark:from-indigo-500 dark:via-purple-500 dark:to-pink-500">
            Josh McCoy
            </h2>
        </div>
        <h3 className="text-3xl">
          full-stack/web3 developer.
        </h3>
        <p className="text-lg my-2">
          For the past 15+ years I've worked my way through the ranks of commercial kitchens while self-teaching web development concepts. Now I create mobile-freindly websites & applications with React.        </p>
        <div className="cross-fade w-full items-center">
          <Image src={profile} className="mx-auto rounded-full"
          alt="My Memoji"
          width="500"
          height="500" />
          <Image src={big_logo_light} className="mx-auto rounded-full block dark:hidden"
          alt="My Logo"
          width="500"
          height="500" />
          <Image src={big_logo_dark} className="mx-auto rounded-full hidden dark:block"
          alt="My Logo"
          width="500"
          height="500" />
        </div>
      </section>
  </main>

  )
}
