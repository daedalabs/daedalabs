import { config, fields, collection, singleton } from '@keystatic/core';

const storageKind =
  process.env.NEXT_PUBLIC_KEYSTATIC_STORAGE_KIND === 'github' ? 'github' : 'local';

export default config({
  storage:
    storageKind === 'github'
      ? {
          kind: 'github',
          repo: {
            owner: process.env.NEXT_PUBLIC_KEYSTATIC_REPO_OWNER || 'daedalabs',
            name: process.env.NEXT_PUBLIC_KEYSTATIC_REPO_NAME || 'daedalabs',
          },
        }
      : {
          kind: 'local',
        },
  ui: {
    brand: {
      name: 'Daedalabs Studio',
    },
  },
  collections: {
    tools: collection({
      label: 'Tools & Experiments',
      slugField: 'name',
      path: 'src/content/tools/*',
      format: { contentField: 'content' },
      schema: {
        name: fields.slug({
          name: {
            label: 'Tool Name',
            validation: { isRequired: true },
          },
        }),
        tagline: fields.text({
          label: 'Tagline / Short Pitch',
          validation: { isRequired: true },
        }),
        status: fields.select({
          label: 'Status',
          options: [
            { label: '🟢 Live / Production', value: 'live' },
            { label: '🟡 Active Beta / WIP', value: 'beta' },
            { label: '🧪 Prototype / Experiment', value: 'experiment' },
            { label: '📦 Archived / Concept', value: 'archived' },
          ],
          defaultValue: 'experiment',
        }),
        category: fields.select({
          label: 'Category',
          options: [
            { label: '🛠️ Build Your Own (From Scratch)', value: 'byox' },
            { label: 'Web Application', value: 'web' },
            { label: 'CLI / Terminal Tool', value: 'cli' },
            { label: 'Microservice / API', value: 'microservice' },
            { label: 'Developer Library / SDK', value: 'library' },
            { label: 'AI / Machine Learning', value: 'ai' },
            { label: 'Automation / Script', value: 'automation' },
            { label: 'Hardware / IoT', value: 'hardware' },
            { label: 'Other', value: 'other' },
          ],
          defaultValue: 'byox',
        }),
        tags: fields.array(fields.text({ label: 'Tag' }), {
          label: 'Tags / Tech Stack',
          itemLabel: (props) => props.value || 'Tag',
        }),
        githubUrl: fields.url({
          label: 'GitHub Repository URL',
        }),
        demoUrl: fields.url({
          label: 'Live Demo URL',
        }),
        npmUrl: fields.url({
          label: 'NPM / Package URL (optional)',
        }),
        featured: fields.checkbox({
          label: 'Pin to Featured Section',
          defaultValue: false,
        }),
        releaseDate: fields.date({
          label: 'Release / Added Date',
          defaultValue: { kind: 'today' },
        }),
        thumbnail: fields.image({
          label: 'Thumbnail / Cover Image',
          directory: 'public/images/tools',
          publicPath: '/images/tools/',
        }),
        content: fields.document({
          label: 'Tool Writeup / Notes',
          formatting: true,
          links: true,
          dividers: true,
          tables: true,
        }),
      },
    }),
  },
  singletons: {
    site: singleton({
      label: 'Site Settings',
      path: 'src/content/settings',
      format: 'json',
      schema: {
        name: fields.text({
          label: 'Lab Name',
          defaultValue: 'Daedalabs',
        }),
        headline: fields.text({
          label: 'Hero Headline',
          defaultValue: 'Experimental software, developer tools, and prototypes.',
        }),
        description: fields.text({
          label: 'About the Lab',
          multiline: true,
          defaultValue:
            'Daedalabs is a personal playground and open-source workshop for building, breaking, and dumping random tools.',
        }),
        githubOrg: fields.url({
          label: 'GitHub Organization URL',
          defaultValue: 'https://github.com/daedalabs',
        }),
        authorName: fields.text({
          label: 'Creator Name',
          defaultValue: 'juhenes',
        }),
        authorUrl: fields.url({
          label: 'Creator Profile / GitHub URL',
          defaultValue: 'https://github.com/juhenes',
        }),
      },
    }),
  },
});
