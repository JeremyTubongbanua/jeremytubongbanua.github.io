import rss from '@astrojs/rss';
import { type APIContext } from 'astro';

interface BlogFrontmatter {
  title: string;
  description: string;
  date: string;
}

interface Blog {
  frontmatter: BlogFrontmatter;
  url: string;
}

export async function GET(context: APIContext) {
  const allBlogs: Blog[] = Object.values(
    import.meta.glob('./blog/**/index.md', { eager: true }));

  const currentDate: Date = new Date();

  // filter only blogs that were posted in the last month
  const visibleBlogs = allBlogs.filter((blog: Blog) => {
    const blogDate: Date = new Date(blog.frontmatter.date);
    if(blogDate.getMonth() == currentDate.getMonth() && blogDate.getYear() == currentDate.getYear()) {
      return true;
    }
    return false;
  });

  const rssToReturn = rss({
    title: 'Jeremy\'s Blog',
    description: 'Jeremy Tubongbanua\'s Personal Career Blog',
    site: context.site || 'https://jeremytubongbanua.github.io',
    items: visibleBlogs.map((blog) => ({
      title: blog.frontmatter.title,
      description: blog.frontmatter.description,
      pubDate: new Date(blog.frontmatter.date),
      link: blog.url,
    })),
    customData: '<language>en-us</language>',
  });
  return rssToReturn;
}


