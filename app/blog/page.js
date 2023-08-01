import Image from 'next/image'
import profile from '/public/profile.png'
import big_logo_light from '/public/big_logo_light.png'
import big_logo_dark from '/public/big_logo_dark.png'
import {Button} from "@/components/ui/button"
import Link from 'next/link'

export default function Home() {
  return (
    <main className="mx-auto text-justify w-5/6 md:w-2/3 lg:w-1/2">
      <section className="mt-16 md:mt-32 lg:mt-96">
        <h1 className="text-2xl md:text-3xl lg:text-4xl">Most recent posts</h1>
        <ul className="text-lg md:text-xl lg:text-2xl mt-2 md:mt-6 lg:mt-10 pb-2 md:pb-4 lg:pb-10 space-y-4 md:space-y-4 lg:space-y-12">
          <li>
            <Link href="/blog/001" className="">
              <h2>Why I gave up on trying to create the perfect portfolio site</h2>
              <h3 className="text-sm text-slate-500">Published on July 31, 2023</h3>
            </Link>
          </li>
          {/* 
          <li>
            <Link href="/blog/001" className="">
              <h2>Why I gave up on trying to create the perfect portfolio site</h2>
              <h3 className="text-sm text-slate-500">Published on July 31, 2023</h3>
            </Link>
          </li>
          <li>
            <Link href="/blog/001" className="">
              <h2>Why I gave up on trying to create the perfect portfolio site</h2>
              <h3 className="text-sm text-slate-500">Published on July 31, 2023</h3>
            </Link>
          </li>
          <li>
            <Link href="/blog/001" className="">
              <h2>Why I gave up on trying to create the perfect portfolio site</h2>
              <h3 className="text-sm text-slate-500">Published on July 31, 2023</h3>
            </Link>
          </li>
          <li>
            <Link href="/blog/001" className="">
              <h2>Why I gave up on trying to create the perfect portfolio site</h2>
              <h3 className="text-sm text-slate-500">Published on July 31, 2023</h3>
            </Link>
          </li>
          */}
          
        </ul>
        <Link href="/blog/archive" className="">
          <h2 className="text-lg md:text-xl lg:text-2xl">Archive</h2>
        </Link>
      </section>
  </main>

  )
}
