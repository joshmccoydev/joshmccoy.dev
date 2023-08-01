import Image from 'next/image'
import profile from '/public/profile.png'
import big_logo_light from '/public/big_logo_light.png'
import big_logo_dark from '/public/big_logo_dark.png'
import {Button} from "@/components/ui/button"
import Link from 'next/link'

export default function Home() {
  return (
    <main className="mx-auto text-justify w-5/6 md:w-2/3 lg:w-1/2">
        <section id="" className="mt-[calc(45%)]">            
          <h2 className="text-2xl">Why I gave up on trying to create the perfect portfolio site</h2>
          <p className="pt-4 text-lg">Lorem ipsum dolor sit amet, consectetur adipisicing elit. Consectetur, odio porro. Labore expedita quis ut quaerat, deleniti perspiciatis maxime eos veritatis doloribus dolores inventore consequuntur fuga consequatur dolorum! Repudiandae, nam!</p>
        </section>
    </main>

  )
}
