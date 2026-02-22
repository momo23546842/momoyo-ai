import Hero from '@/components/sections/Hero'
import About from '@/components/sections/About'
import Career from '@/components/sections/Career'
import Skills from '@/components/sections/Skills'
import Works from '@/components/sections/Works'
import Booking from '@/components/sections/Booking'
import Contact from '@/components/sections/Contact'

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <Career />
      <Skills />
      <Works />
      <Booking />
      <Contact />
    </main>
  )
}
