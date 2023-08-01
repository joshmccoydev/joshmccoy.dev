import Image from 'next/image'
import profile from '/public/profile.png'
import big_logo_light from '/public/big_logo_light.png'
import big_logo_dark from '/public/big_logo_dark.png'
import {Button} from "@/components/ui/button"
import Link from 'next/link'

export default function Home() {
  return (
    <main className="container md:w-2/3 lg:w-1/2">
      <section className="mt-10">
        <h1 className="text-4xl">Most recent posts</h1>
        <ul className="text-2xl mt-4 pb-10 space-y-4">
          <li>
            <Link href="/blog/001" className="">
              <h2>Why I gave up on trying to create the perfect portfolio site</h2>
              <h3 className="text-sm">Published on July 31, 2023</h3>
            </Link>
          </li>
          {/*<li>
            <Link href="/blog/001" className="">
              <h2>The second post</h2>
              <h3 className="text-sm">Published in the future</h3>
            </Link>
          </li>
          <li>
            <Link href="/blog/001" className="">
              <h2>Why I gave up on trying to create the perfect portfolio site</h2>
              <h3 className="text-sm">Published on July 31, 2023</h3>
            </Link>
          </li>
          <li>
            <Link href="/blog/001" className="">
              <h2>Why I gave up on trying to create the perfect portfolio site</h2>
              <h3 className="text-sm">Published on July 31, 2023</h3>
            </Link>
          </li>
          <li>
            <Link href="/blog/001" className="">
              <h2>Why I gave up on trying to create the perfect portfolio site</h2>
              <h3 className="text-sm">Published on July 31, 2023</h3>
            </Link>
          </li>*/}
        </ul>
      </section>
  </main>

  )
}
