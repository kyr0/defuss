The idea is to provide a few simple layout components that support:
- splitters for internal resizing
- remembering last state using defuss/cache

Such as:
- *Fit*:
Make the element as big as the parent, and keep it fitting.
- *HBox*: 
Position children horizontally, stretch if desired.
(a | b | ...)
- *VBox*:
Position children vertically, stretch if desired.
a
-
b
-
...
- *Absolute*:
Position the component somewhere relative to it's parent or the viewport and keep its postion 
relative, even when scrolled.