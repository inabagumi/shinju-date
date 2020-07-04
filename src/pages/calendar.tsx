import chunk from 'lodash.chunk'
import groupBy from 'lodash.groupby'
import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React from 'react'
import Container from '@/components/atoms/Container'
import LinkButton from '@/components/atoms/LinkButton'
import Card, {
  CardFooter,
  CardHeader,
  CardImage
} from '@/components/molecules/Card'
import Grid, { Col, Row } from '@/components/molecules/Grid'
import Hero, { HeroTitle } from '@/components/organisms/Hero'
import talents from '@/data/talents'
import styles from '@/styles/calendar.module.css'

const Calendar: NextPage = () => (
  <>
    <NextSeo title="カレンダーリスト" />

    <Hero color="dark">
      <HeroTitle>カレンダーリスト</HeroTitle>
    </Hero>

    <Container>
      {Object.entries(groupBy(talents, (talent) => talent.group)).map(
        ([group, items]) => (
          <section className="margin-vert--xl" key={group}>
            <h2 className="margin-bottom--lg text--center">{group}</h2>
            <Grid>
              {chunk(items, 3).map((items) => (
                <Row key={items.map((item) => item.id).join(':')}>
                  {items.map((item) => {
                    const url = `webcal://shinju.date/calendar/${item.id}.ics`

                    return (
                      <Col className="margin-bottom--lg" key={item.id} size={4}>
                        <Card>
                          <CardHeader>
                            <h4>{item.name}</h4>
                          </CardHeader>
                          <CardImage>
                            <a
                              href={`https://www.youtube.com/channel/${item.id}`}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              <div className={styles.dummyImage} />
                            </a>
                          </CardImage>
                          <CardFooter>
                            <div className="button-group button-group--block">
                              <LinkButton
                                color="secondary"
                                href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(
                                  url
                                )}`}
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                Android
                              </LinkButton>
                              <LinkButton
                                color="secondary"
                                href={url}
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                iOS
                              </LinkButton>
                            </div>
                          </CardFooter>
                        </Card>
                      </Col>
                    )
                  })}
                </Row>
              ))}
            </Grid>
          </section>
        )
      )}
    </Container>
  </>
)

export default Calendar
