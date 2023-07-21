import Image from 'next/image'
import profile from './profile.png'

export default function Home() {
  return (
    <main className="text-center my-80">
      <section id="">
        <h2 className="text-6xl py-2">
          Joshua McCoy
        </h2>
        <h3 className="text-4xl py-2">
          Full-stack Web Developer
        </h3>
        <p className="text-lg py-2">
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Earum deserunt rem nostrum praesentium ullam molestiae eos tenetur cupiditate amet veniam dignissimos eveniet, recusandae sunt minima quisquam fugit quis. Perferendis, eveniet.
        </p>        
        <p className="text-lg">
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Earum deserunt rem nostrum praesentium ullam molestiae eos tenetur cupiditate amet veniam dignissimos eveniet, recusandae sunt minima quisquam fugit quis. Perferendis, eveniet.
        </p>

        <Image className="mx-auto rounded-full py-20"
          src={profile}
          width={400}
          height={400}
          alt="Picture of the author"
        />
      </section>

      <section id="skills" className="mt-20">
        <h3 className="text-2xl text-left">Skills</h3>
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
