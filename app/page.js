import Image from 'next/image'
import profile from '/public/profile.png'
import big_logo_light from '/public/big_logo_light.png'
import big_logo_dark from '/public/big_logo_dark.png'
import {Button} from "@/components/ui/button"


export default function Home() {
  return (
    <main className="container text-center py-40">
      <section id="about" className="min-h-screen">
        <h3 className="text-4xl z-10 -rotate-[6.75deg]">👋Hello, World!</h3>
        <div className="flex justify-center pt-2">
            <h2 className="text-4xl my-auto">I'm&nbsp;</h2>
            <h2 className="text-5xl my-auto pb-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text dark:bg-gradient-to-r dark:from-indigo-500 dark:via-purple-500 dark:to-pink-500">
            Josh McCoy
            </h2>
        </div>
        <h3 className="text-3xl">
          a professional chef turned full-stack dev.
        </h3>
        <p className="text-md my-2">
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Earum deserunt rem nostrum praesentium ullam molestiae eos tenetur cupiditate amet veniam dignissimos eveniet, recusandae sunt minima quisquam fugit quis. Perferendis, eveniet.
        </p>        
        <p className="text-md my-2 mb-4">
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Earum deserunt rem nostrum praesentium ullam molestiae eos tenetur cupiditate amet veniam dignissimos eveniet, recusandae sunt minima quisquam fugit quis. Perferendis, eveniet.
        </p>
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

      <section id="services" className="p-4 shadow-lg rounded-lg bg-slate-50 dark:bg-slate-800">
        <h3 className="text-2xl text-left">Tools</h3>
          <div className="shadow-lg rounded-lg">
            <h4>2</h4>
            <p className="text-lg p-2"></p>
          </div>
      </section> 

      <section id="skills" className="mt-20 p-4 shadow-lg rounded-lg bg-slate-50 dark:bg-slate-800">
        <h3 className="text-2xl text-left">Tools</h3>
          <div className="shadow-lg rounded-lg">
            <h4>2</h4>
            <p className="text-lg p-2"></p>
          </div>
      </section>
  </main>

  )
}
