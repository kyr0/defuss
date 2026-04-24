## defuss-db 2.0.0+ TODOs

Follow-up work, if needed:

- I think we can support the jsonl provider on the web easily as well - we can store it in localStorage or even sessionStorage configurable. But to do so, we first to refactor defuss/webstorage to become its own defuss package to prevent a strange circular/transient dependency with defuss -> defuss-db -> defuss... 
