import React, {useEffect, useState} from "react";

const Loading = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {show ? (

        <div className="text-center">Loading from the chain, please wait...</div>

      ) : null}
    </>
  );
};

export default Loading;
