+++
title = "Cheat Sheet"
date = 2022-05-31
description = "Markdown Cheat Sheet for testing use"

updated = 2022-06-01

[taxonomies]
tags = [ "test", "test2", "test3", "test4" ]
series = [ "myseries" ]

[extra]
series_index = 0

+++

Often times we need a simple example document laying out the basics of a thing we're using.

# Markdown Cheat Sheet

Thanks for visiting [The Markdown Guide](https://www.markdownguide.org)!

This Markdown cheat sheet provides a quick overview of all the Markdown syntax elements. It can’t cover every edge case, so if you need more information about any of these elements, refer to the reference guides for [basic syntax](https://www.markdownguide.org/basic-syntax) and [extended syntax](https://www.markdownguide.org/extended-syntax).

## Basic Syntax

These are the elements outlined in John Gruber’s original design document. All Markdown applications support these elements.

### Heading

# H1
## H2
### H3
#### H4
##### H5
###### H6

### Bold

**bold text**

### Italic

*italicized text*

### Blockquote

> blockquote

### Ordered List

1. First item
2. Second item
3. Third item

### Unordered List

- First item
- Second item
- Third item

### Code

`code`

### Horizontal Rule

---

### Link

[Markdown Guide](https://www.markdownguide.org)

### Image

![alt text](https://www.markdownguide.org/assets/images/tux.png)

## Extended Syntax

These elements extend the basic syntax by adding additional features. Not all Markdown applications support these elements.

### Table

| Syntax | Description |
| ----------- | ----------- |
| Header | Title |
| Paragraph | Text |

### Fenced Code Block

```
{
  "firstName": "John",
  "lastName": "Smith",
  "age": 25
}
```

### Footnote

Here's a sentence with a footnote. [^1]

[^1]: This is the footnote.

### Heading ID

### My Great Heading {#custom-id}

### Definition List

term
: definition

### Strikethrough

~~The world is flat.~~

### Task List

- [x] Write the press release
- [ ] Update the website
- [ ] Contact the media

### Emoji

That is so funny! :joy:

(See also [Copying and Pasting Emoji](https://www.markdownguide.org/extended-syntax/#copying-and-pasting-emoji))

### Highlight

I need to highlight these ==very important words==.

{% highlight() %}
test
{% end %}

### Subscript

H~2~O

### Superscript

X^2^


# Testing custom macros (or whatever)

## Gist
{{ gist(url="https://gist.github.com/Keats/e5fb6aad409f28721c0ba14161644c57", class="gist") }}

## Asides

Here's some text
{% aside(caption="Uh oh!") %}
    this is test
{% end %}

{% aside(icon="question", caption="Uh oh?") %}
    this is test
{% end %}

{% aside(icon="lightbulb", caption="Uh.. Oh!") %}
    this is test
{% end %}

{% aside(icon="warning", caption="Uh! oh!") %}
    this is test
{% end %}

{% aside(icon="bug") %}
    this is test
{% end %}

## Image test
{{ round_image(path="static/images/me.jpg", width=64, height=64, alt="Test") }}