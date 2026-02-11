import Navbar from '../components/Navbar'
import Banner from '../components/Banner'
import HomeCourse from '../components/HomeCourse'
import Testimonials from '../components/Testimonials'
import Footer from '../components/Footer'

const Home = () => {
  return (
    <div>
        <Navbar />
        <Banner />
        <HomeCourse />
        <Testimonials />
        <Footer />
    </div>
  )
}

export default Home