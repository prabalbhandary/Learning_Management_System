import { facultyStyles } from "../assets/dummyStyles"
import sampleTeachers from "../assets/dummyFaculty"
import { Instagram, Linkedin, Mail, Star } from "lucide-react"

const motion = {
  div: ({children, initial, animate, transition, className}) => (
    <div className={className}>{children}</div>
  )
}

const FacultyPage = () => {
  return (
    <div className={facultyStyles.container}>
        <div className={facultyStyles.header}>
            <div className={facultyStyles.headerContent}>
                <h1 className={facultyStyles.title}>Meet Our Faculty</h1>
                <div className={facultyStyles.titleDivider}></div>
                <p className={facultyStyles.subtitle}>Learn from industry experts and academic pioneers dedicated to your success</p>
            </div>
        </div>
        <div className={facultyStyles.facultySection}>
          <div className={facultyStyles.facultyContainer}>
            <div className={facultyStyles.facultyGrid}>
              {sampleTeachers.map((t, i) => (
                <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={facultyStyles.card}
              >
                <div className={facultyStyles.teacherCard}>
                  <div className={facultyStyles.imageContainer}>
                    <div className={facultyStyles.imageWrapper}>
                      <img src={t.image} alt={t.name} className={facultyStyles.image} />
                    </div>
                    <div className={facultyStyles.experienceBadge}>
                      <div className={facultyStyles.experienceBadgeContent}>{t.experience} Exp</div>
                    </div>
                  </div>
                  <div className={facultyStyles.teacherInfo}>
                    <h3 className={facultyStyles.teacherName}>{t.name}</h3>
                    <p className={facultyStyles.teacherQualification}>{t.qualification}</p>
                    <p className={facultyStyles.teacherBio}>{t.bio}</p>
                  </div>
                  <div className={facultyStyles.ratingContainer}>
                    <div className={facultyStyles.starRating}>
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`${facultyStyles.starIcon} ${
                            i < Math.round(t.initialRating)
                              ? facultyStyles.starButtonActive
                              : facultyStyles.starButtonInactive
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className={facultyStyles.socialContainer}>
                    <a href={`mailto:${t.email}`} className={`${facultyStyles.socialIcon} ${facultyStyles.socialIconEmail}`} title={`Email ${t.name}`}>
                      <Mail className={facultyStyles.socialIconSvg} />
                    </a>
                    <a href={t.linkedin} target="_blank" className={`${facultyStyles.socialIcon} ${facultyStyles.socialIconLinkedin}`}>
                      <Linkedin className={facultyStyles.socialIconSvg} />
                    </a>
                    <a href={t.instagram} target="_blank" className={`${facultyStyles.socialIcon} ${facultyStyles.socialIconInstagram}`}>
                      <Instagram className={facultyStyles.socialIconSvg} />
                    </a>
                  </div>
                </div>
              </motion.div>
              ))}
            </div>
          </div>
        </div>
        <style jsx>{facultyStyles.animations}</style>
    </div>
  )
}

export default FacultyPage
