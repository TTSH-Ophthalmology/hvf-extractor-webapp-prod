export const scrollPageToTop = () => {
  const pageContent = document.querySelector<HTMLElement>('.page-content')

  pageContent?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
}
