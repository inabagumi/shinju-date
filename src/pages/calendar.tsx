import chunk from 'lodash.chunk'
import groupBy from 'lodash.groupby'
import type { NextPage } from 'next'
import { NextSeo } from 'next-seo'

import Page from '@/components/Layout'
import talents from '@/data/talents'
import styles from '@/styles/calendar.module.css'

const Calendar: NextPage = () => (
  <>
    <NextSeo title="カレンダーリスト" />

    <Page>
      <div className="hero hero--dark">
        <div className="container">
          <h1 className="hero__title">カレンダーリスト</h1>
        </div>
      </div>

      <div className="container">
        {Object.entries(groupBy(talents, (talent) => talent.group)).map(
          ([group, items]) => (
            <section className="margin-vert--xl" key={group}>
              <h2 className="margin-bottom--lg text--center">{group}</h2>
              <div className="container">
                {chunk(items, 3).map((items) => (
                  <div
                    className="row"
                    key={items.map((item) => item.id).join(':')}
                  >
                    {items.map((item) => {
                      const url = `webcal://shinju.date/calendar/${item.id}.ics`

                      return (
                        <div
                          className="col col--4 margin-bottom--lg"
                          key={item.id}
                        >
                          <div className="card">
                            <div className="card__header">
                              <h4>{item.name}</h4>
                            </div>
                            <div className="card__image">
                              <a
                                href={`https://www.youtube.com/channel/${item.id}`}
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                <div className={styles.dummyImage} />
                              </a>
                            </div>
                            <div className="card__footer">
                              <div className="button-group button-group--block">
                                <a
                                  className="button button--secondary"
                                  href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(
                                    url
                                  )}`}
                                  rel="noopener noreferrer"
                                  target="_blank"
                                >
                                  Android
                                </a>
                                <a
                                  className="button button--secondary"
                                  href={url}
                                  rel="noopener noreferrer"
                                  target="_blank"
                                >
                                  iOS
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </section>
          )
        )}
      </div>
    </Page>
  </>
)

export default Calendar
