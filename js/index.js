const URL = "http://localhost:3000";
const searchIcon = document.querySelector("#user-search-input")
  .nextElementSibling;
const searchInput = document.querySelector("#user-search-input");
const tweetList = document.querySelector(".tweet-list");
const loadMoreBtn = document.querySelector(".load-more");
const myModal = document.getElementById('my-modal');
const modalImg = document.getElementById('img01');
const mCloseBtn = document.getElementsByClassName("close")[0];
let tweetObject = [];
let nextToken = {};

/**
 * Retrive Twitter Data from API
 */
const getTwitterData = (nextPage = false) => {
  const postIDs = [];
  let fullURL = `${URL}/tweets?query=${encodeURIComponent(
    searchInput.value
  )}&max_results=10`;

  if (nextPage) {
    fullURL = `${URL}/nextpage?query=${encodeURIComponent(
      JSON.parse(localStorage.getItem("query"))
    )}&max_results=10&next_token=${nextToken.next_token}`;
  } else {
    if (!searchInput.value) return;
    localStorage.setItem("query", JSON.stringify(searchInput.value));
  }

  return fetch(`${fullURL}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      return response.json();
    })
    .then((tweetData) => {
      const { data, meta } = tweetData;
      data.map((item) => {
        postIDs.push(item.id);
        return postIDs;
      });

      if (!nextPage) {
        searchInput.value = "";
      }
      saveNextPage(meta);
      buildTweets(postIDs);
    }).catch((err) => console.log(err));
};

/**
 * Save the next page data
 */
const saveNextPage = (metadata) => {
  nextToken = { ...metadata };
  return nextToken;
};

const loadMore = () => {
  if(!Object.keys(nextToken).length) return;
  getTwitterData(true);
};

/**
 * Build Tweets HTML based on Data from API
 */
const buildTweets = (tweetId) => {
  return fetch(
    `${URL}/buildtweet?expansions=attachments.media_keys&media.fields=media_key,preview_image_url,type,url&tweet.fields=created_at,author_id,source`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tweetId),
    }
  )
    .then((response) => response.json())
    .then((tweetData) => {
      const { data, includes } = tweetData;
      data.map((item) => {
        return extractTweet(item, includes);
      });
    }).then(() => {
      const authorIdList = [];

      tweetObject.map((item) => {
        const {authorID} = item;
        authorIdList.push(authorID);
      })

      return getUserDetails(authorIdList, tweetObject);
    })
    .then((tweetUserDatas) => {
      const {data} = tweetUserDatas;
      const finalObj = getCombinedObj(tweetObject, data);
      buildHtml(finalObj);
      tweetObject = [];
    }).then(() => {
      const tweetImg = document.querySelectorAll('div.tweet-image');
      Array.from(tweetImg).map(item => {
        item.addEventListener('click', () => {
          onImgClick(item);
        });
      })

      mCloseBtn.addEventListener('click', onCloseModal);
      myModal.addEventListener('click', onCloseModal);
    }
    ).catch(err => console.log(err));
};

const getCombinedObj = (obj1, obj2) => {
  const combinedObj = [];
  for (i = 0; i < obj1.length; i++) {
    combinedObj.push(
      {
        ...obj1[i],
        "userData": Array.from(obj2)[i]
      }
    );
  }

  return combinedObj;
}

const getUserDetails = (userIds) => {
  return fetch(
    `${URL}/getusers?user.fields=name,profile_image_url,url,username`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userIds),
    }
  ).then(response => response.json())
    .then(userData => {
      return userData;
    })
    .catch(err => console.log(err));
}

const extractTweet = (data, includes) => {
  let results = [];
  if (data.attachments) {
    const {
      attachments: { media_keys },
    } = data;
    const { media } = includes;

    media.map((item) => {
      for (let i = 0; i < media_keys.length; i++) {
        if (item.media_key == media_keys[i]) {
      results.push(item);
        }
      }
    });
  }

  const { text, created_at, source, author_id } = data;

  return tweetObject.push({
    tweetText: text,
    tweetMedia: results,
    createdAt: created_at,
    sourceFrom: source,
    authorID: author_id
  });
};

const buildHtml = (tweetObj) => {
  let isImg = 0;
  let imgURL;
  let tweetData = "";

  tweetObj.map((item) => {
    const { tweetText, tweetMedia, createdAt, sourceFrom, authorID, userData: {name, username, profile_image_url} } = item;
    if (tweetMedia.length != 0) {
      if (tweetMedia.length % 2 !== 0) {
        const { url, preview_image_url } = tweetMedia[0];
        imgURL = url || preview_image_url;
        isImg = 1;
      } else if (tweetMedia.length == 2) {
        isImg = 2;
      } else if (tweetMedia.length == 4) {
        isImg = 4;
      }
    } else {
      imgURL = "";
      isImg = 0;
    }

    tweetData += generateTweetHeader(name, username, profile_image_url);

    if (isImg === 1) {
      tweetData += buildTweetWithImg(imgURL);
    } else if (isImg === 2) {
      tweetData += buildTwoImg(tweetMedia);
    } else if (isImg === 4) {
      tweetData += buildFourImg(tweetMedia);
    }

    tweetData += buildWithTxt(tweetText);
    tweetData += generateTweetFooter(createdAt, sourceFrom);
  });

  const div = document.createElement("div");
  div.innerHTML = tweetData;
  tweetList.append(div);
};

const generateTweetHeader = (tweeterName, tweeterUserName, profileImgUrl) => {
  return `
  <div class="tweet-container">
    <div class="tweet-user-info">
      <div class="tweet-user-profile">
        <div style="background-image: url(${profileImgUrl});"></div>
      </div>
      <div class="tweet-user-name-container">
        <div class="tweet-user-fullname">${tweeterName}</div>
        <div class="tweet-user-name">@${tweeterUserName}</div>
      </div>
    </div>`;
}

const buildTweetWithImg = (imgSrc) => {
  return `
     <div class="tweet-images-container">
       <div class="tweet-image" style="width: 100%;height: 350px;background-image: url(${imgSrc});background-size: cover;background-position: center;background-repeat: no-repeat;">
      </div>
     </div>
 `;
};

const buildTwoImg = (media) => {
  return `
     <div class="tweet-images-container">
       <div class="tweet-image" style="width: 49.75%;height: 200px;background-image: url(${
         media[0].url || media[0].preview_image_url
       });background-size: cover;background-position: center;background-repeat: no-repeat;margin-right: 0.25%;">
       </div>
       <div class="tweet-image" style="width: 49.75%;height: 200px;background-image: url(${
         media[1].url || media[1].preview_image_url
       });background-size: cover;background-position: center;background-repeat: no-repeat;margin-left: 0.25%;">
       </div>
     </div>
 `;
};

const buildFourImg = (media) => {
  let imgData = '';
  const xDir = ['right', 'left', 'right', 'left'];
  const yDir = ['bottom', 'bottom', 'top', 'top'];
  for(let i = 0; i < 4; i++) {
    imgData += `
    <div class="tweet-image" style="width: 49.75%;height: 200px;background-image: url(${
      media[i].url || media[i].preview_image_url
    });background-size: cover;background-position: center;background-repeat: no-repeat;margin-${xDir[i]}: 0.25%;margin-${yDir[i]}: 0.25%;">
    </div>
    `
  }
  return `
     <div class="tweet-images-container">
       ${imgData}
     </div>
 `;
};

const buildWithTxt = (txt) => {
  return `
    <div class="tweet-text-container">
      ${txt}
    </div>
`;
};

const generateTweetFooter = (tweetDate, tweetDevice) => {
  return  `
  <div class="tweet-footer">
    <div class="tweet-date-container">
    ${moment(tweetDate).fromNow()}
    </div>
    <div class="source-from">
    From: ${tweetDevice}
    </div>
  </div>
  </div>  
`;
}

searchIcon.addEventListener("click", getTwitterData);
loadMoreBtn.addEventListener("click", loadMore);

const onEnter = (e) => {
  if (e.key === "Enter") {
    Array.from(tweetList.querySelectorAll("div")).map((item) => item.remove());
    getTwitterData();
  }
};

const onImgClick = (ele) => {
  const imgUrl = ele.style.backgroundImage.split('"')[1];
  myModal.style.display = 'block';
  modalImg.src = imgUrl;
}

const onCloseModal = () => {
  myModal.style.display = 'none';
}