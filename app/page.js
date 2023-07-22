import Image from 'next/image'
import profile from '/public/profile.png'
import logo from '/public/logo.png'
import logo2 from '/public/logo2.png'

export default function Home() {
  return (
    <main className="container text-center my-48">
      <section id="about" className="pb-96">
        <h3 className="text-5xl z-10 text-left -rotate-[6.75deg]">👋Hello, World!</h3>
        <div className="flex justify-center pt-2">
            <h2 className="text-5xl my-auto">I'm&nbsp;</h2>
            <h2 className="text-6xl my-auto pb-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text dark:bg-gradient-to-r dark:from-indigo-500 dark:via-purple-500 dark:to-pink-500">
            Josh McCoy
            </h2>
        </div>
        <h3 className="text-4xl dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-indigo-500 dark:via-purple-500 dark:to-pink-500">
          A prefessional chef by day &< br /> a self-taught, full-stack web developer by night!
        </h3>
        <p className="text-lg my-2">
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Earum deserunt rem nostrum praesentium ullam molestiae eos tenetur cupiditate amet veniam dignissimos eveniet, recusandae sunt minima quisquam fugit quis. Perferendis, eveniet.
        </p>        
        <p className="text-lg my-2 mb-4">
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Earum deserunt rem nostrum praesentium ullam molestiae eos tenetur cupiditate amet veniam dignissimos eveniet, recusandae sunt minima quisquam fugit quis. Perferendis, eveniet.
        </p>

        <div className="cross-fade w-full items-center">
          <Image src={profile} className="mx-auto rounded-full"
          alt="My Memoji"
          width="500"
          height="500" />

          <Image src={logo} className="mx-auto rounded-full"
          alt="My Logo"
          width="500"
          height="500" />
        </div>
      </section>

      <section id="skills" className="mt-40">
        <h3 className="text-2xl text-left">Services</h3>
          <div className="shadow-lg rounded-lg">
            <h4>HTML 5 & CSS3</h4>
            <p className="text-lg p-2">
            </p>
        </div>
      </section> 

      <section id="skills" className="mt-20">
        <h3 className="text-2xl text-left">Tools</h3>
          <div className="shadow-lg rounded-lg">
            <h4>HTML 5 & CSS3</h4>
            <p className="text-lg p-2">
            </p>
        </div>
      </section>


      <section id="skills" className="mt-20">
        <h3 className="text-2xl text-left">Projects</h3>
          <div className="shadow-lg rounded-lg">
            <h4>HTML 5 & CSS3</h4>
            <p className="text-lg p-2">
            </p>
        </div>
      </section>


      <section id="skills" className="mt-20">
        <h3 className="text-2xl text-left">Contact</h3>
          <div className="shadow-lg rounded-lg">
            <h4>HTML 5 & CSS3</h4>
            <p className="text-lg p-2">
            </p>
        </div>
      </section>
    </main>

  )
}
