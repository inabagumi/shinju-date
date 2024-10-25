import getTerms from './_lib/get-terms'

export default async function TermsPage() {
  const terms = await getTerms()

  return (
    <dl className="">
      {terms.map(({ readings, synonyms, term }) => (
        <div
          className="space-y-4 border-secondary-blue px-2 py-4 not-last:border-b"
          key={term}
        >
          <dt className="text-lg font-semibold">{term}</dt>
          <dd className="grid grid-cols-2 gap-2">
            <form action="" encType="multipart/form-data" method="post">
              {[...(synonyms ?? []), ''].map((synonym) => (
                <div className="py-2" key={synonym}>
                  <input
                    className="inline-block w-full rounded-md border border-774-blue-300 px-2 py-1 focus:outline-0 focus-visible:border-secondary-blue"
                    type="text"
                    value={synonym}
                  />
                </div>
              ))}
            </form>
            <form action="" encType="multipart/form-data" method="post">
              {[...(readings ?? []), ''].map((reading) => (
                <div className="py-2" key={reading}>
                  <input
                    className="inline-block w-full rounded-md border border-774-blue-300 px-2 py-1 focus:outline-0 focus-visible:border-secondary-blue"
                    type="text"
                    value={reading}
                  />
                </div>
              ))}
            </form>
          </dd>
        </div>
      ))}
    </dl>
  )
}
