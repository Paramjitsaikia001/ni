import Navbar from '../components/LandingPage/Navbar'
import Hero from '../components/LandingPage/Hero'
import TrustedBy from '../components/LandingPage/TrustedBy'
import FeaturedJobs from '../components/LandingPage/FeaturedJobs'
import HowItWorks from '../components/LandingPage/HowItWorks'
import Testimonials from '../components/LandingPage/Testimonials'
import Footer from '../components/LandingPage/Footer'

const LandingPage = () => {
  return (
    <>
    <Navbar />
    <Hero />
    <TrustedBy />
    <FeaturedJobs />
    <HowItWorks />
    <Testimonials />
    <Footer />
    </>
  )
}

export default LandingPage