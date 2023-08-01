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
            <h2 className="text-2xl">Why I gave up on trying to create the perfect portfolio site</h2>
            <p className="pt-4">Lorem ipsum dolor, sit amet consectetur adipisicing elit. Explicabo obcaecati nihil et esse? Animi dicta ad est sint nisi eius, pariatur accusantium exercitationem laboriosam sapiente blanditiis consequuntur minus consectetur quibusdam.</p>
        </section>
    </main>

  )
}
